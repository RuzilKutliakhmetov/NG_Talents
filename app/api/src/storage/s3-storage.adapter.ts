import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import { StorageObjectBody, StoragePort } from './storage.interface.js';

export interface S3StorageOptions {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  forcePathStyle: boolean;
  presignedUrlExpiresSeconds: number;
}

@Injectable()
export class S3StorageAdapter implements StoragePort {
  private readonly client: S3Client;

  constructor(private readonly options: S3StorageOptions) {
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKey,
        secretAccessKey: options.secretKey,
      },
    });
  }

  async initializeBucket() {
    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.options.bucket }),
      );
    } catch (error) {
      if (!this.isMissingBucket(error)) throw error;
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.options.bucket }),
        );
      } catch (createError) {
        if (!this.isBucketAlreadyExists(createError)) throw createError;
      }
    }
  }

  async putObject(
    key: string,
    body: StorageObjectBody,
    contentType: string,
    contentLength?: number,
  ) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(contentLength === undefined
          ? {}
          : { ContentLength: contentLength }),
      }),
    );
  }

  async getObject(key: string) {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
    );
    if (!response.Body) throw new Error('Storage object response has no body');
    if ('transformToByteArray' in response.Body) {
      return response.Body.transformToByteArray();
    }
    return this.readStream(response.Body as Readable);
  }

  async deleteObject(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }),
    );
  }

  async exists(key: string) {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      if (this.isNotFound(error)) return false;
      throw error;
    }
  }

  createDownloadUrl(
    key: string,
    expiresIn = this.options.presignedUrlExpiresSeconds,
  ) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
      { expiresIn },
    );
  }

  async checkHealth() {
    await this.client.send(
      new HeadBucketCommand({ Bucket: this.options.bucket }),
    );
  }

  private async readStream(stream: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  private isMissingBucket(error: unknown) {
    return (
      this.errorCode(error) === 'NoSuchBucket' ||
      this.errorCode(error) === 'NotFound'
    );
  }

  private isBucketAlreadyExists(error: unknown) {
    const code = this.errorCode(error);
    return code === 'BucketAlreadyOwnedByYou' || code === 'BucketAlreadyExists';
  }

  private isNotFound(error: unknown) {
    const code = this.errorCode(error);
    return code === 'NoSuchKey' || code === 'NotFound' || code === '404';
  }

  private errorCode(error: unknown) {
    if (typeof error !== 'object' || error === null) return undefined;
    const value = error as {
      name?: string;
      Code?: string;
      $metadata?: { httpStatusCode?: number };
    };
    return (
      value.name ?? value.Code ?? value.$metadata?.httpStatusCode?.toString()
    );
  }
}

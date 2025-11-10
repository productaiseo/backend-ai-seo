import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'verification', timestamps: true })
export class Verification extends Document {
  @Prop({ required: true })
  identifier: string;

  @Prop({ required: true })
  value: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);

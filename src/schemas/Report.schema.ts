import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

@Schema({
  collection: 'reports',
  versionKey: false,
})
export class Report {
  @Prop({ type: String, required: true, unique: true, index: true })
  jobId!: string;

  @Prop({ type: String, required: true })
  userId?: string | null;

  @Prop({ type: String, required: true })
  domain?: string | null;

  @Prop({ type: String, required: true })
  createdAt?: string;
  @Prop({ type: String, required: true })
  updatedAt?: string;

  @Prop({ type: Number, default: null })
  finalGeoScore?: number | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  arkheReport?: null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  prometheusReport?: null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  delfiAgenda?: null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  generativePerformanceReport?: null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  performanceReport?: null;

  @Prop({ type: String, default: null })
  queryId?: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  enhancedAnalysis?: null;
}

export type ReportDocument = Report & Document;
export const ReportSchema = SchemaFactory.createForClass(Report);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

// Nested schema for topQueries
class TopQuery {
  @Prop({ type: String })
  query: string;

  @Prop({ type: Number })
  volume: number;

  @Prop({ type: Number })
  position: number;
}

@Schema({
  timestamps: true,
  collection: 'analysisjobs',
  versionKey: false,
})
export class AnalysisJob {
  @Prop({ type: String, required: true, unique: true, index: true })
  id: string;

  @Prop({ type: String })
  queryId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, index: true })
  urlHost: string;

  @Prop({ type: String })
  locale: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'QUEUED',
      'PROCESSING_SCRAPE',
      'PROCESSING_PSI',
      'PROCESSING_ARKHE',
      'PROCESSING_PROMETHEUS',
      'PROCESSING_LIR',
      'PROCESSING_GENERATIVE_PERFORMANCE',
      'PROCESSING_STRATEGIC_IMPACT',
      'COMPLETED',
      'FAILED',
    ],
  })
  status: string;

  @Prop({ type: Number, default: null })
  finalGeoScore: number;

  @Prop({ type: String })
  scrapedContent: string;

  @Prop({ type: String })
  scrapedHtml: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  arkheReport: any;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  prometheusReport: any;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  delfiAgenda: any;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  generativePerformanceReport: any;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  strategicImpactForecast: any;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  performanceReport: any;

  @Prop({ type: String })
  error: string;

  @Prop({ type: [TopQuery], _id: false })
  topQueries: TopQuery[];

  @Prop({ type: String, required: true })
  createdAt: string;

  @Prop({ type: String, required: true })
  updatedAt: string;
}

export type AnalysisJobDocument = AnalysisJob & Document;
export const AnalysisJobSchema = SchemaFactory.createForClass(AnalysisJob);

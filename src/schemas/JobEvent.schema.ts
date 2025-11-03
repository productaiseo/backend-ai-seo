import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'jobevents',
  versionKey: false,
})
export class JobEvent {
  @Prop({ type: String, required: true, index: true })
  jobId: string;

  @Prop({ type: String, required: true })
  step: string;

  @Prop({
    type: String,
    required: true,
    enum: ['STARTED', 'COMPLETED', 'FAILED'],
  })
  status: string;

  @Prop({ type: Object, default: null })
  meta: any;

  @Prop({ type: String, required: true })
  ts: string; // ISO string
}

export type JobEventDocument = JobEvent & Document;
export const JobEventSchema = SchemaFactory.createForClass(JobEvent);

// Create indexes
JobEventSchema.index({ jobId: 1, ts: -1 });

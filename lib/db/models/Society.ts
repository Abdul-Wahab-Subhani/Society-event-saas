import { Schema, model, models, type Document, type Types } from "mongoose";

export interface CertificateTemplate {
  backgroundUrl?: string;
  signatureUrl?: string;
  layoutConfig?: {
    nameY?: number; // vertical position (0-1, fraction of page height) for the recipient name
    titleY?: number;
    fontFamily?: string;
    accentColor?: string;
  };
}

export interface SocietyDocument extends Document {
  name: string;
  logo?: string;
  description?: string;
  admins: Types.ObjectId[];
  certificateTemplate: CertificateTemplate;
  createdAt: Date;
  updatedAt: Date;
}

const SocietySchema = new Schema<SocietyDocument>(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String },
    description: { type: String, trim: true },
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    certificateTemplate: {
      backgroundUrl: { type: String },
      signatureUrl: { type: String },
      layoutConfig: {
        nameY: { type: Number, default: 0.5 },
        titleY: { type: Number, default: 0.35 },
        fontFamily: { type: String, default: "Helvetica" },
        accentColor: { type: String, default: "#3457d5" },
      },
    },
  },
  { timestamps: true }
);

export const Society = models.Society || model<SocietyDocument>("Society", SocietySchema);

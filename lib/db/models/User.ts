import { Schema, model, models, type Document, type Types, type Model } from "mongoose";

export type SocietyRole = "admin" | "organizer";

export interface UserSocietyMembership {
  societyId: Types.ObjectId;
  role: SocietyRole;
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  refreshTokenHash: string | null;
  societies: UserSocietyMembership[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    // Hash of the current valid refresh token, not the token itself.
    // Rotated on every /api/auth/refresh call; null after logout, which
    // invalidates all outstanding refresh tokens for this user.
    refreshTokenHash: { type: String, default: null },

    societies: [
      {
        _id: false,
        societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true },
        role: { type: String, enum: ["admin", "organizer"], required: true },
      },
    ],
  },
  { timestamps: true }
);

export const User = (models.User as Model<UserDocument>) || model<UserDocument>("User", UserSchema);

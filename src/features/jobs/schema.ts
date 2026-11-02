import { z } from "zod";
import { HUBS, codes } from "@/lib/pune";

export const EMPLOYMENT_TYPES = [
  { code: "full_time", name: "Full-time" },
  { code: "contract", name: "Contract" },
  { code: "internship", name: "Internship" },
] as const;

export const WORK_MODES = [
  { code: "onsite", name: "On-site" },
  { code: "hybrid", name: "Hybrid" },
  { code: "remote", name: "Remote" },
] as const;

export const REFERRAL_STATUS = {
  requested: { label: "Requested", tone: "secondary" },
  in_review: { label: "In review", tone: "warning" },
  referred: { label: "Referred", tone: "success" },
  declined: { label: "Declined", tone: "destructive" },
  withdrawn: { label: "Withdrawn", tone: "secondary" },
} as const;

const https = z.string().trim().url("Enter a full https:// link").startsWith("https://", "Link must start with https://");

export const jobSchema = z
  .object({
    title: z.string().trim().min(4).max(120),
    description: z.string().trim().min(30, "Describe the role in at least 30 characters").max(5000),
    employmentType: z.enum(codes(EMPLOYMENT_TYPES)),
    workMode: z.enum(codes(WORK_MODES)),
    experienceMin: z.coerce.number().int().min(0).max(40),
    experienceMax: z.coerce.number().int().min(0).max(40),
    hubCode: z.enum(codes(HUBS), { errorMap: () => ({ message: "Pick the Pune office" }) }),
    applyUrl: z.union([z.literal(""), https]).optional(),
  })
  .refine((v) => v.experienceMax >= v.experienceMin, { path: ["experienceMax"], message: "Max must be ≥ min" });

export const referralSchema = z.object({
  jobId: z.string().uuid(),
  message: z.string().trim().min(20, "Tell them a bit about yourself (20+ characters)").max(1500),
  resumeUrl: z.union([z.literal(""), https]).optional(),
});

import { z } from "zod";

export const config = z
  .object({
    EPROJET_BASE_URL: z.url().transform((u) => u.replace(/\/+$/, "")),
    EPROJET_USER: z.string().min(1),
    EPROJET_PASS: z.string().min(1),
  })
  .parse(process.env);

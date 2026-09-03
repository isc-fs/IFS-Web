import { defineCollection, z } from 'astro:content';

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string(),
    /** featured = the big story; card = grid entry; brief = dated one-liner */
    kind: z.enum(['featured', 'card', 'brief']),
    /** Grid columns out of 6. Ignored for briefs. */
    span: z.number().optional(),
    excerpt: z.string().optional(),
    image: z.string().optional()
  })
});

export const collections = { news };

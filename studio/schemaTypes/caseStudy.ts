import {defineField, defineType} from 'sanity'

// Mirrors the live document shape in the `production` dataset exactly
// (name, slug, year, tags, type, location, order), plus `sections` — the
// TOC-driven case-study body consumed by CaseStudyContent.tsx in the Next.js
// app (each section = one TOC entry, in array order).
export default defineType({
  name: 'caseStudy',
  title: 'Case Study',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Short summary shown on the project card/sticker.',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'string',
      description: 'e.g. "UX / MR" — shown next to the year in the header.',
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Which desk section this shows up in — "Work" or "Notes".',
      options: {list: ['Work', 'Notes']},
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower numbers appear first.',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      description: 'The case-study body. Each entry becomes one TOC sidebar item, in this order.',
      of: [
        {
          type: 'object',
          name: 'section',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'content',
              title: 'Content',
              type: 'array',
              of: [
                {type: 'block'},
                {
                  type: 'image',
                  options: {hotspot: true},
                  fields: [
                    defineField({
                      name: 'alt',
                      title: 'Alt text',
                      type: 'string',
                      description: 'Important for accessibility and SEO.',
                    }),
                    defineField({
                      name: 'caption',
                      title: 'Caption',
                      type: 'string',
                    }),
                  ],
                },
                {type: 'videoEmbed'},
                {type: 'embedHtml'},
                {type: 'sideBySide'},
              ],
            }),
          ],
          preview: {
            select: {title: 'title'},
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'type',
    },
  },
})

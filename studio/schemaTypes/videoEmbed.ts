import {defineField, defineType} from 'sanity'

// A video by URL rather than upload — either a direct file (.mp4/.webm) or a
// host page (YouTube/Vimeo/Loom). The renderer picks <video> vs <iframe>
// based on the URL shape; see VideoEmbedBlock in
// src/components/portableTextComponents.tsx.
export default defineType({
  name: 'videoEmbed',
  title: 'Video',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'Video URL',
      type: 'url',
      description: 'A direct .mp4/.webm link, or a YouTube/Vimeo/Loom page URL.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
  ],
  preview: {
    select: {title: 'url', subtitle: 'caption'},
  },
})

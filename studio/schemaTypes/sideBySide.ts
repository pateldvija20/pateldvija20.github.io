import {defineField, defineType} from 'sanity'

// Image/video/embed on one side, rich text on the other. `media` is an
// array capped at one item so Studio's "Add item" picker doubles as a type
// selector (image vs video vs custom embed) without a separate field per kind.
export default defineType({
  name: 'sideBySide',
  title: 'Media + Text (side by side)',
  type: 'object',
  fields: [
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      description: 'Add exactly one: an image, a video, or a custom HTML embed.',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({name: 'alt', title: 'Alt text', type: 'string'}),
          ],
        },
        {type: 'videoEmbed'},
        {type: 'embedHtml'},
      ],
      validation: (Rule) => Rule.max(1).min(1),
    }),
    defineField({
      name: 'text',
      title: 'Text',
      type: 'array',
      of: [{type: 'block'}],
    }),
    defineField({
      name: 'mediaPosition',
      title: 'Media position',
      type: 'string',
      options: {
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Right', value: 'right'},
        ],
        layout: 'radio',
      },
      initialValue: 'left',
    }),
  ],
  preview: {
    select: {position: 'mediaPosition'},
    prepare({position}) {
      return {title: 'Side by side', subtitle: `Media on the ${position || 'left'}`}
    },
  },
})

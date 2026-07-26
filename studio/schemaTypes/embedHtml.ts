import {defineField, defineType} from 'sanity'

// A self-contained HTML/CSS/JS snippet (scoped styles + markup + script),
// same shape as the one-off interactive diagrams already being hand-built
// for case studies. Pasted as-is and rendered client-side — see
// EmbedHtmlBlock in src/components/portableTextComponents.tsx.
export default defineType({
  name: 'embedHtml',
  title: 'Custom HTML Embed',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Internal label',
      type: 'string',
      description: 'For your reference in the Studio outline — not shown on the site.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'html',
      title: 'HTML / CSS / JS',
      type: 'text',
      rows: 20,
      description: 'Paste a self-contained snippet. It runs on the page exactly as pasted.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {title: 'label'},
    prepare({title}) {
      return {title: title || 'Untitled embed', subtitle: 'Custom HTML Embed'}
    },
  },
})

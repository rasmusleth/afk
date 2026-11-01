import { defineArrayMember, defineField, defineType } from 'sanity';

const text = (name: string, title: string, max: number, multiline = false) =>
  defineField({
    name,
    title,
    type: multiline ? 'text' : 'string',
    ...(multiline ? { rows: 3 } : {}),
    validation: (rule) =>
      rule
        .required()
        .max(max)
        .custom((value) =>
          typeof value === 'string' && value.trim() ? true : 'Skriv en tekst.',
        ),
  });
const photo = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'image',
    options: { hotspot: true },
    fields: [text('alt', 'Billedbeskrivelse', 200)],
    description:
      'Valgfrit. Beskriv billedets indhold, og vælg beskæring/fokuspunkt.',
  });
export const homepage = defineType({
  name: 'homepage',
  title: 'Forside',
  type: 'document',
  // Starting values only: published contact information remains editor-owned.
  initialValue: {
    contactName: 'Aalborg Futsal Klub',
    contactEmail: 'info@aalborgfutsal.dk',
  },
  fields: [
    text('heroTitle', 'Overskrift', 40),
    text('heroAccent', 'Fremhævet linje', 30),
    text('heroIntro', 'Introduktion', 250, true),
    defineField({
      name: 'featuredCompetition',
      title: 'Turnering på forsiden',
      type: 'reference',
      to: [{ type: 'competition' }],
      description:
        'Vælg turnering til næste kamp, resultat og stilling. Kun hold markeret som Aalborg-hold vises.',
    }),
    text('newsHeading', 'Overskrift over nyheder', 80),
    text('clubTitle', 'Overskrift om klubben', 100),
    text('clubText', 'Om klubben', 1500, true),
    photo('clubImage', 'Klubbillede'),
    text('contactTitle', 'Kontaktoverskrift', 100),
    text('contactText', 'Kontakt og deltagelse', 700, true),
    text('contactName', 'Kontaktperson eller funktion', 100),
    defineField({
      name: 'contactEmail',
      title: 'Kontakt-e-mail',
      type: 'email',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'trainingInfo',
      title: 'Om træning (valgfrit)',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(700),
    }),
    text('seoDescription', 'Beskrivelse til søgemaskiner', 200, true),
  ],
  preview: {
    prepare: () => ({
      title: 'Forside',
      subtitle: 'Udgiv for at gøre ændringer klar til næste bygning',
    }),
  },
});
export const newsArticle = defineType({
  name: 'newsArticle',
  title: 'Nyhed',
  type: 'document',
  fields: [
    text('title', 'Overskrift', 150),
    defineField({
      name: 'slug',
      title: 'Adresse',
      type: 'slug',
      options: { source: 'title', maxLength: 80 },
      validation: (rule) =>
        rule
          .required()
          .custom(
            (value) =>
              !value ||
              /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current ?? '') ||
              'Brug små bogstaver a-z, tal og bindestreger.',
          ),
    }),
    text('excerpt', 'Kort introduktion', 350, true),
    defineField({
      name: 'publishedAt',
      title: 'Dato',
      type: 'datetime',
      description:
        'En fremtidig dato vises først ved en bygning efter det tidspunkt.',
      validation: (rule) => rule.required(),
    }),
    photo('image', 'Nyhedsbillede'),
    defineField({
      name: 'body',
      title: 'Artikeltekst',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Afsnit', value: 'normal' },
            { title: 'Mellemrubrik', value: 'h2' },
          ],
          lists: [],
          marks: {
            decorators: [
              { title: 'Fed', value: 'strong' },
              { title: 'Kursiv', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    validation: (rule) =>
                      rule.required().uri({ scheme: ['http', 'https'] }),
                  }),
                ],
              },
            ],
          },
        }),
      ],
    }),
  ],
  orderings: [
    {
      title: 'Nyeste først',
      name: 'dateDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'publishedAt', media: 'image' },
  },
});
export const editorialDocuments = [homepage, newsArticle];

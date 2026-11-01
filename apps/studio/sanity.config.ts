import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {ReviewTool} from './review/ReviewTool';
import {SportsInput} from './review/SportsInput';
import {schemaTypes} from './schemaTypes';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET;
if (!projectId || !dataset) {
  throw new Error('Set SANITY_STUDIO_PROJECT_ID and SANITY_STUDIO_DATASET in apps/studio/.env.local. See docs/sanity-studio.md.');
}
export default defineConfig({
  name: 'afk', title: 'Aalborg Futsal Klub', projectId, dataset,
  plugins: [structureTool({structure: S => S.list().title('Aalborg Futsal Klub').items([
    S.listItem().title('Forside').child(S.document().schemaType('homepage').documentId('homepage')),
    S.documentTypeListItem('newsArticle').title('Nyheder'),
    S.divider(),
    S.documentTypeListItem('match').title('Matches'),
    S.documentTypeListItem('competition').title('Competitions'),
    S.documentTypeListItem('season').title('Seasons'),
    S.documentTypeListItem('team').title('Teams'),
    S.documentTypeListItem('player').title('Players'),
  ])})],
  tools: previous => [...previous, {name: 'sports-review', title: 'Sports review', component: ReviewTool}],
  form: {components: {input: SportsInput}},
  schema: {types: schemaTypes, templates: templates => templates.filter(template => template.schemaType !== 'homepage')},
  document: {actions: (actions, context) => context.schemaType === 'homepage' ? actions.filter(action => action.action !== 'duplicate') : actions},
});

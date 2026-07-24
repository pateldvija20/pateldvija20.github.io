import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '7b0nphlp',
    dataset: 'production'
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: false,
  },
})

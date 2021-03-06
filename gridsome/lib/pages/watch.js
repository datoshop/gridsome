const path = require('path')
const { debounce } = require('lodash')

module.exports = (app, pages) => {
  const createPages = debounce(() => app.plugins.createPages(), 16)
  const fetchQueries = debounce(() => app.broadcast({ type: 'fetch' }), 16)
  const generateRoutes = debounce(() => app.codegen.generate('routes.js'), 16)

  app.store.on('change', () => app.isBootstrapped ? createPages() : null)
  pages._routes.on('insert', () => app.isBootstrapped ? generateRoutes() : null)
  pages._routes.on('delete', () => app.isBootstrapped ? generateRoutes() : null)

  pages._routes.on('update', (route, oldRoute) => {
    if (!app.isBootstrapped) return

    if (oldRoute.path !== route.path) {
      return generateRoutes()
    }

    fetchQueries()
  })

  pages._watcher.on('change', filePath => {
    if (!app.isBootstrapped) return

    const routes = pages._routes.find({
      'internal.dependencies': {
        $contains: path.normalize(filePath)
      }
    })

    for (let i = 0; i < routes.length; i++) {
      const { type, name, component, internal } = routes[i]
      const options = { type, name, path: internal.path, component }

      pages.updateRoute(options, {
        digest: internal.digest,
        isManaged: internal.isManaged
      })
    }
  })
}

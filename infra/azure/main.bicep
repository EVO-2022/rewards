param location string = 'eastus'
param appName string
param imageName string
param postgresAdmin string
param postgresPassword string

resource env 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${appName}-plan'
  location: location
  sku: {
    name: 'B1'
  }
}

resource app 'Microsoft.Web/sites@2022-03-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: env.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${imageName}'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'PORT', value: '8080' }
        { name: 'DATABASE_URL', value: '' }
        { name: 'CLERK_PUBLISHABLE_KEY', value: '' }
        { name: 'CLERK_SECRET_KEY', value: '' }
        { name: 'JWT_SECRET', value: '' }
        { name: 'RATE_LIMIT_WINDOW_MS', value: '' }
        { name: 'RATE_LIMIT_MAX_REQUESTS', value: '' }
      ]
    }
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: '${appName}-db'
  location: location
  properties: {
    administratorLogin: postgresAdmin
    administratorLoginPassword: postgresPassword
    version: '15'
    storage: {
      storageSizeGB: 32
    }
  }
  sku: {
    name: 'B_Standard_B1ms'
    tier: 'Burstable'
  }
}


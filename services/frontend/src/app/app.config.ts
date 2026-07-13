import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core'
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withRouterConfig } from '@angular/router'
import { provideHttpClient, withInterceptors } from '@angular/common/http'

import { routes } from './app.routes'
import { authInterceptor } from './core/auth.interceptor'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      // Without this, clicking a link to the same path with only a different
      // #fragment (e.g. the Vulnerability Remediation fleet card while already
      // on /vulnerabilities) is treated as a no-op and silently ignored.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
}

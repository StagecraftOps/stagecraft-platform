import { HttpInterceptorFn } from '@angular/common/http'
import { catchError, throwError } from 'rxjs'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const withCreds = req.clone({ withCredentials: true })
  return next(withCreds).pipe(
    catchError((err) => {
      if (err.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/'
      }
      return throwError(() => err)
    }),
  )
}

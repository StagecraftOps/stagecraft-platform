import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: '',
})
export class AuthCallbackComponent implements OnInit {
  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code') ?? ''
    const state = this.route.snapshot.queryParamMap.get('state') ?? ''
    const params = new URLSearchParams({ code, state })
    window.location.href = `/api/v1/auth/callback?${params.toString()}`
  }
}

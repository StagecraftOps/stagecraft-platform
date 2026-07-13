import { AfterViewInit, Component, ElementRef, OnDestroy, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'

interface Step {
  number: string
  title: string
  description: string
  code: string
}

const steps: Step[] = [
  {
    number: 'I',
    title: 'Connect your org',
    description:
      'Sign in with GitHub OAuth and connect your organisation. Stagecraft installs a webhook that streams every workflow_run event — queued, running, completed — directly to your dashboard.',
    code: `# 1. Authenticate via GitHub OAuth
# 2. Connect your org in Settings
# 3. Stagecraft installs a webhook:

POST /orgs/{org}/hooks
{
  "events": ["workflow_run"],
  "config": {
    "url": "https://stagecraft.app/webhooks/github"
  }
}

# Backfill of historical runs starts immediately`,
  },
  {
    number: 'II',
    title: 'See every run, live',
    description:
      'The unified /runs view shows every workflow run across every repo — filtered by repo, status, or conclusion. WebSocket pushes real-time updates as runs transition from queued → running → done.',
    code: `# GET /api/v1/runs/
# ?org_login=myorg
# &repo_name=api-service
# &status=in_progress

{
  "runs": [
    {
      "workflow_name": "CI",
      "repo_name": "api-service",
      "status": "in_progress",
      "branch": "main",
      "conclusion": null
    }
  ],
  "total": 14
}`,
  },
  {
    number: 'III',
    title: 'AI suggests the fix',
    description:
      "When a run fails, AWS Bedrock reads the failure logs and the workflow YAML. It identifies the root cause and produces a corrected YAML file. You review the suggestion — nothing is committed without your approval.",
    code: `# POST /api/v1/remediations/{id}/raise-pr
# Only called when YOU click "Raise PR"

# Bedrock's analysis (stored, not auto-committed):
{
  "root_cause": "Node version mismatch — workflow
    specifies 16 but lock file requires >=18",
  "suggested_yaml": "name: CI\\non: [push]\\n..."
}

# On your click: branch created, YAML committed,
# PR opened — with your GitHub token, in your repo`,
  },
]

@Component({
  selector: 'app-how-it-works-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how-it-works-section.component.html',
})
export class HowItWorksSectionComponent implements AfterViewInit, OnDestroy {
  steps = steps
  visible = signal(false)
  activeStep = signal(0)

  activeLines = computed(() => steps[this.activeStep()].code.split('\n'))

  private observer?: IntersectionObserver
  private stepInterval?: ReturnType<typeof setInterval>

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) this.visible.set(true)
      },
      { threshold: 0.1 },
    )
    this.observer.observe(this.el.nativeElement)

    this.stepInterval = setInterval(() => {
      this.activeStep.set((this.activeStep() + 1) % steps.length)
    }, 5000)
  }

  ngOnDestroy() {
    this.observer?.disconnect()
    if (this.stepInterval) clearInterval(this.stepInterval)
  }

  setActiveStep(i: number) {
    this.activeStep.set(i)
  }

  isComment(line: string): boolean {
    return line.trim().startsWith('#')
  }
}

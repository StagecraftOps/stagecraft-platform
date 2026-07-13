{{- define "common.fullname" -}}
{{- $name := .Values.nameOverride | default .Chart.Name -}}
stagecraft-{{ $name }}
{{- end -}}

{{- define "common.componentName" -}}
{{ include "common.fullname" . }}{{ .Values.componentSuffix | default "" }}
{{- end -}}

{{- define "common.labels" -}}
app.kubernetes.io/name: {{ include "common.componentName" . }}
app.kubernetes.io/part-of: stagecraft
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "common.selectorLabels" -}}
app.kubernetes.io/name: {{ include "common.componentName" . }}
{{- end -}}

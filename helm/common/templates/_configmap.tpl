{{- define "common.configMap" -}}
{{- if .Values.env }}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "common.fullname" . }}-config
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "common.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation
data:
  {{- range $key, $value := .Values.env }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
{{- end }}
{{- end -}}

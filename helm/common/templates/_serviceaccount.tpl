{{- define "common.serviceAccount" -}}
{{- if .Values.serviceAccount.create }}
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "common.fullname" . }}
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "common.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation
    {{- if .Values.serviceAccount.roleArn }}
    eks.amazonaws.com/role-arn: {{ .Values.serviceAccount.roleArn }}
    {{- end }}
{{- end }}
{{- end -}}

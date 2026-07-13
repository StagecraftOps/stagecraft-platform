{{- define "common.externalSecret" -}}
{{- if .Values.externalSecret.enabled }}
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: {{ include "common.fullname" . }}-secrets
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "common.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  secretStoreRef:
    name: {{ .Values.externalSecret.storeName }}
    kind: ClusterSecretStore
  target:
    name: {{ include "common.fullname" . }}-secrets
    creationPolicy: Owner
  refreshInterval: {{ .Values.externalSecret.refreshInterval | default "1h" }}
  dataFrom:
    - extract:
        key: {{ .Values.externalSecret.awsSecretName }}
{{- end }}
{{- end -}}

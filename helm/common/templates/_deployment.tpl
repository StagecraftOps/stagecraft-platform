{{- define "common.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "common.componentName" . }}
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "common.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "common.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "common.selectorLabels" . | nindent 8 }}
    spec:
      serviceAccountName: {{ include "common.fullname" . }}
      containers:
        - name: {{ include "common.componentName" . }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy | default "IfNotPresent" }}
          {{- if .Values.command }}
          command:
            {{- toYaml .Values.command | nindent 12 }}
          {{- end }}
          {{- if .Values.containerPort }}
          ports:
            - name: http
              containerPort: {{ .Values.containerPort }}
          {{- end }}
          envFrom:
            {{- if .Values.env }}
            - configMapRef:
                name: {{ include "common.fullname" . }}-config
            {{- end }}
            - secretRef:
                name: {{ include "common.fullname" . }}-secrets
                optional: true
          {{- if .Values.livenessProbe }}
          livenessProbe:
            {{- toYaml .Values.livenessProbe | nindent 12 }}
          {{- end }}
          {{- if .Values.readinessProbe }}
          readinessProbe:
            {{- toYaml .Values.readinessProbe | nindent 12 }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
{{- end -}}

/** 用户自定义 AI 网关配置的校验规则（server action 与 API route 共用） */

export const MODEL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
export const BASE_URL_RE = /^https?:\/\/[^\s]+$/i;
export const MAX_KEY_LEN = 512;
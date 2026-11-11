import type { FormRule } from 'antd'
import type { z } from 'zod'

/**
 * 将 zod schema 转为 antd Form 校验规则，表单与接口共用同一份校验定义。
 * 必填星号请使用 Form.Item 的 `required` 属性，提示文案以 zod 中的定义为准。
 * @param schema - 字段 schema（如 `userCreateSchema.shape.name`）
 * @returns antd 校验规则
 */
export const zodRule = (schema: z.ZodType): FormRule => ({
  validator: async (_rule, value: unknown) => {
    const result = schema.safeParse(value)
    if (!result.success) throw new Error(result.error.issues[0]?.message ?? '格式不正确')
  },
})

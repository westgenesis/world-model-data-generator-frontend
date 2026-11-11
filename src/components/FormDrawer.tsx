import type { FormInstance } from 'antd'
import { Button, Drawer, Form } from 'antd'
import type { ReactNode } from 'react'

interface FormDrawerProps<V> {
  /** 是否打开 */
  open: boolean
  /** 抽屉标题 */
  title: ReactNode
  /** 关闭抽屉 */
  onClose: () => void
  /** 校验通过后提交，返回 Promise 时按钮显示加载中 */
  onSubmit: (values: V) => unknown
  /** 外部表单实例（需要 useWatch 等联动时传入） */
  form?: FormInstance<V>
  /** 表单初始值，每次打开时生效 */
  initialValues?: Partial<V>
  /** 提交中 */
  submitting?: boolean
  /** 提交按钮文案 */
  submitText?: ReactNode
  /** 禁用提交按钮 */
  submitDisabled?: boolean
  /** 抽屉宽度 */
  width?: number
  /** 表单前的提示等内容 */
  header?: ReactNode
  /** 表单后的提示等内容 */
  footer?: ReactNode
  /** 表单项；默认两列网格，整行项加 `sm:col-span-2` */
  children: ReactNode
}

/**
 * 表单抽屉：统一的标题、底部「取消 / 保存」按钮与两列表单布局。
 * 关闭时销毁表单，重新打开以 initialValues 为准。
 * @param props - 抽屉与表单配置
 */
export const FormDrawer = <V extends object>({
  open,
  title,
  onClose,
  onSubmit,
  form: outerForm,
  initialValues,
  submitting,
  submitText = '保存',
  submitDisabled,
  width = 560,
  header,
  footer,
  children,
}: FormDrawerProps<V>) => {
  const [innerForm] = Form.useForm<V>()
  const form = outerForm ?? innerForm

  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      size={width}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            loading={submitting}
            disabled={submitDisabled}
            onClick={() => form.submit()}
          >
            {submitText}
          </Button>
        </div>
      }
    >
      {header}
      <Form<V>
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={onSubmit}
        preserve={false}
        className="grid grid-cols-1 gap-x-4 sm:grid-cols-2"
      >
        {children}
      </Form>
      {footer}
    </Drawer>
  )
}

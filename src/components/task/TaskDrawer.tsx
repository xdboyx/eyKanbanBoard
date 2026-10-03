import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useLeaveGuard } from '../../hooks/useLeaveGuard'
import {
  PRIORITIES,
  PRIORITY_NAMES,
  STATUSES,
  STATUS_NAMES,
  TASK_TEXT_LIMITS,
  type Priority,
  type Status,
  type TaskDraft,
  type TaskDraftErrors,
  type TaskTextField,
} from '../../types/board'
import { textLength, validateTaskDraft } from '../../utils/taskDraft'
import { Button } from '../Button'
import { ConfirmDialog } from '../ConfirmDialog'
import { Drawer } from '../Drawer'

const inputClassName =
  'focus-ring box-border w-full border border-gray-600 bg-transparent px-3 text-body text-text hover:border-text aria-invalid:border-text light:border-gray-300 light:hover:border-text light:aria-invalid:border-text'

/**
 * 新增或編輯任務的抽屜。按「儲存」才交給 onSave，欄位不合法時顯示提示並留在抽屜。
 * 有未儲存的修改時，任何離開（關閉、取消、上一頁）都會先詢問是否放棄。
 */
export function TaskDrawer({
  title,
  initial,
  completedDate,
  onSave,
  onDelete,
  onClose,
}: {
  title: string
  initial: TaskDraft
  /** 編輯時顯示唯讀的完成日；新增時不傳 */
  completedDate?: string | null
  /** 儲存成功時回傳 null，欄位不合法時回傳各欄位的錯誤 */
  onSave: (draft: TaskDraft) => TaskDraftErrors | null
  /** 編輯時才有刪除 */
  onDelete?: () => void
  onClose: () => void
}) {
  // 開啟時的值只取一次，之後看板有變動也不覆蓋正在編輯的表單
  const [opened] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  /** 抽屜滑出後要做的事；不為 null 時正在滑出 */
  const [afterLeave, setAfterLeave] = useState<(() => void) | null>(null)
  // 開始滑出後就不再接受操作；state 要等重新渲染才更新，連點時用 ref 擋下第二次
  const leaving = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const id = useId()

  const dirty = JSON.stringify(draft) !== JSON.stringify(opened)
  const guard = useLeaveGuard(dirty)
  const errors = validateTaskDraft(draft)

  /** 先讓抽屜滑出，動畫結束後才離開 */
  function leave(then: () => void) {
    if (leaving.current) return
    leaving.current = true
    setAfterLeave(() => then)
  }

  /** 沒有修改時滑出後關閉；有修改時直接導覽，由離開攔截詢問是否放棄 */
  function requestClose() {
    if (dirty) onClose()
    else leave(onClose)
  }

  function update<K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  /** 字數超過時立即提示；標題未填等按過儲存才提示，剛開啟的新增表單不會一片錯誤 */
  function errorOf(field: TaskTextField) {
    return submitted || draft[field].trim() ? errors[field] : undefined
  }

  function save(event: FormEvent) {
    event.preventDefault()
    if (leaving.current) return
    if (onSave(draft)) {
      flushSync(() => setSubmitted(true))
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    guard.release()
    leave(onClose)
  }

  function textFieldProps(field: TaskTextField) {
    const error = errorOf(field)
    return {
      id: `${id}-${field}`,
      value: draft[field],
      'aria-invalid': Boolean(error),
      'aria-describedby': error ? `${id}-${field}-error` : undefined,
      onChange: (event: { target: { value: string } }) => update(field, event.target.value),
    }
  }

  return (
    <Drawer title={title} closing={afterLeave !== null} onClose={requestClose} onClosed={() => afterLeave?.()}>
      <form ref={formRef} noValidate onSubmit={save} className="flex min-h-0 grow flex-col">
        <div className="flex min-h-0 grow flex-col gap-6 overflow-y-auto px-8 py-6 max-sm:px-4">
          <TextField label="標題" field="title" id={id} draft={draft} error={errorOf('title')}>
            <input {...textFieldProps('title')} data-autofocus type="text" className={`${inputClassName} h-11`} />
          </TextField>
          <TextField label="摘要" field="summary" id={id} draft={draft} error={errorOf('summary')}>
            <textarea {...textFieldProps('summary')} rows={4} className={`${inputClassName} resize-y py-2`} />
          </TextField>
          <div className="grid grid-cols-2 gap-4">
            <Field label="狀態" htmlFor={`${id}-status`}>
              <select
                id={`${id}-status`}
                value={draft.status}
                onChange={(event) => update('status', event.target.value as Status)}
                className={`${inputClassName} h-11 cursor-pointer`}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_NAMES[status]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="優先級" htmlFor={`${id}-priority`}>
              <select
                id={`${id}-priority`}
                value={draft.priority}
                onChange={(event) => update('priority', event.target.value as Priority)}
                className={`${inputClassName} h-11 cursor-pointer`}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_NAMES[priority]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="標籤" field="tag" id={id} draft={draft} error={errorOf('tag')}>
              <input {...textFieldProps('tag')} type="text" className={`${inputClassName} h-11`} />
            </TextField>
            <TextField label="負責人" field="owner" id={id} draft={draft} error={errorOf('owner')}>
              <input {...textFieldProps('owner')} type="text" className={`${inputClassName} h-11`} />
            </TextField>
          </div>
          <Field label="到期日" htmlFor={`${id}-due`}>
            <div className="flex gap-2">
              <input
                id={`${id}-due`}
                type="date"
                value={draft.dueDate ?? ''}
                onChange={(event) => update('dueDate', event.target.value || null)}
                className={`${inputClassName} h-11 min-w-0`}
              />
              <Button disabled={!draft.dueDate} onClick={() => update('dueDate', null)}>
                清除
              </Button>
            </div>
          </Field>
          {completedDate !== undefined && (
            <div className="flex flex-col gap-2">
              <span className="text-label">完成日</span>
              <span className="text-body">{completedDate ?? '—'}</span>
              <span className="text-caption text-muted">由系統在任務進入「已完成」時記錄，離開時清除</span>
            </div>
          )}
        </div>
        <div className="flex flex-none flex-wrap items-center gap-4 border-t border-rule px-8 py-5 max-sm:px-4">
          {onDelete && <Button onClick={() => setConfirmingDelete(true)}>刪除</Button>}
          <div className="ml-auto flex gap-4">
            <Button onClick={requestClose}>取消</Button>
            <Button type="submit" variant="primary">
              儲存
            </Button>
          </div>
        </div>
      </form>
      {confirmingDelete && onDelete && !afterLeave && (
        <ConfirmDialog
          title="刪除這個任務？"
          message="刪除後無法復原。"
          confirmLabel="刪除"
          cancelLabel="取消"
          onConfirm={() => {
            guard.release()
            leave(() => {
              onDelete()
              onClose()
            })
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
      {guard.blocked && !afterLeave && (
        <ConfirmDialog
          title="放棄未儲存的修改？"
          message="關閉後，這次的修改不會保存。"
          confirmLabel="放棄"
          cancelLabel="繼續編輯"
          onConfirm={() => leave(guard.leave)}
          onCancel={guard.stay}
        />
      )}
    </Drawer>
  )
}

/** 一個欄位：上方標籤，下方輸入元件 */
function Field({ label, htmlFor, aside, children }: { label: string; htmlFor: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-label">
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  )
}

/** 有字數上限的文字欄位：標籤旁顯示字數，不合法時在下方顯示提示 */
function TextField({
  label,
  field,
  id,
  draft,
  error,
  children,
}: {
  label: string
  field: TaskTextField
  id: string
  draft: TaskDraft
  error: string | undefined
  children: ReactNode
}) {
  return (
    <Field
      label={label}
      htmlFor={`${id}-${field}`}
      aside={
        <span className="text-caption text-muted">
          {textLength(draft[field].trim())}/{TASK_TEXT_LIMITS[field]}
        </span>
      }
    >
      {children}
      {error && (
        <p id={`${id}-${field}-error`} className="m-0 text-small">
          {error}
        </p>
      )}
    </Field>
  )
}

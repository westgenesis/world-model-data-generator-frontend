import type { TablePaginationConfig } from 'antd'
import { useEffect, useState } from 'react'

/** 默认每页条数 */
export const DEFAULT_PAGE_SIZE = 20

/**
 * 返回延迟更新的值，用于关键词输入等高频变化场景
 * @param value - 原始值
 * @param delay - 延迟毫秒数
 * @returns 防抖后的值
 */
export const useDebouncedValue = <T>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** useListParams 配置项 */
interface ListParamsOptions {
  /** 每页条数 */
  pageSize?: number
  /** 手动查询：筛选条件经 submit 提交后才用于请求，配合「查询」按钮使用 */
  manualSearch?: boolean
}

/**
 * 管理列表页的筛选条件与分页：筛选变化时回到第一页，参数按需防抖后用于请求
 * @param initialFilters - 筛选条件初始值（同时作为重置值）
 * @param options - 每页条数与是否手动查询
 * @returns 筛选条件、查询提交函数、请求参数与 antd 分页配置
 */
export const useListParams = <F extends object>(
  initialFilters: F,
  { pageSize = DEFAULT_PAGE_SIZE, manualSearch = false }: ListParamsOptions = {},
) => {
  const [filters, setFilters] = useState(initialFilters)
  /** 已提交的筛选条件：手动查询模式下用于请求 */
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [page, setPage] = useState({ page: 1, pageSize })
  const debouncedFilters = useDebouncedValue(filters)

  /**
   * 更新单个筛选条件
   * @param key - 筛选字段
   * @param value - 新值
   */
  const setFilter = <K extends keyof F>(key: K, value: F[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    if (!manualSearch) setPage((prev) => ({ ...prev, page: 1 }))
  }

  /** 应用当前筛选条件并回到第一页（手动查询模式下由查询按钮触发） */
  const submit = () => {
    setAppliedFilters(filters)
    setPage((prev) => ({ ...prev, page: 1 }))
  }

  /** 重置筛选条件并回到第一页 */
  const reset = () => {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
    setPage((prev) => ({ ...prev, page: 1 }))
  }

  /**
   * 生成 antd Table 分页配置
   * @param total - 总条数
   * @returns 分页配置
   */
  const getPagination = (total = 0): TablePaginationConfig => ({
    current: page.page,
    pageSize: page.pageSize,
    total,
    showSizeChanger: true,
    showTotal: (count) => `共 ${count} 条`,
    onChange: (current, size) =>
      setPage({ page: size === page.pageSize ? current : 1, pageSize: size }),
  })

  return {
    filters,
    setFilter,
    submit,
    reset,
    params: { ...(manualSearch ? appliedFilters : debouncedFilters), ...page },
    getPagination,
  }
}

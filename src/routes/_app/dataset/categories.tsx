import { createFileRoute } from '@tanstack/react-router'
import { DataCategoriesPage } from '@/features/dataset/categories/DataCategoriesPage'

/** 数据分类管理：分类体系维护（种子 / 合成数据集 + 标签集） */
export const Route = createFileRoute('/_app/dataset/categories')({
  component: DataCategoriesPage,
})

"use client";

import { useCallback, useEffect, useState } from "react";
import { getTasks } from "@/services/taskService";
import type {
  PaginatedTasks,
  Task,
  TaskListQuery,
} from "@/types/task";

function getTaskListResult(result: Task[] | PaginatedTasks) {
  return Array.isArray(result)
    ? { tasks: result, pageInfo: null }
    : { tasks: result.tasks, pageInfo: result };
}

export function useTasks(query?: TaskListQuery) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pageInfo, setPageInfo] = useState<PaginatedTasks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = getTaskListResult(await getTasks(query));
      setTasks(result.tasks);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load tasks. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    let isCurrent = true;

    getTasks(query)
      .then((result) => {
        if (isCurrent) {
          const loaded = getTaskListResult(result);
          setTasks(loaded.tasks);
          setPageInfo(loaded.pageInfo);
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load tasks. Please try again.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [query]);

  return { tasks, pageInfo, isLoading, error, reload };
}

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, ArrowUpDown, ChevronUp, ChevronDown, Filter, X } from "lucide-react";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";

/**
 * DataTable - A reusable data table component with sorting, filtering, and actions
 * Can be used for any entity list display with customizable columns and actions
 *
 * @param {Object} props
 * @param {Array} props.data - Array of data items to display
 * @param {Array} props.columns - Column configuration array
 * @param {Array} props.actions - Actions configuration for each row
 * @param {Function} props.onSearch - Search callback function
 * @param {Function} props.onSort - Sort callback function
 * @param {boolean} props.loading - Loading state
 * @param {string} props.searchPlaceholder - Search input placeholder
 * @param {string} props.emptyMessage - Message when no data
 * @param {string} props.title - Table title
 * @param {Object} props.headerActions - Actions to show in table header
 * @param {boolean} props.showSearch - Show search input
 * @param {boolean} props.showHeader - Show table header
 * @param {Array} props.filters - Filter configuration array
 * @param {Object} props.filterValues - Current filter values
 * @param {Function} props.onFilterChange - Filter change callback
 * @param {boolean} props.showFilters - Show filter controls
 * @param {string} props.className - Additional CSS classes
 */
export default function DataTable({
  data = [],
  columns = [],
  actions = [],
  onSearch,
  onSort,
  loading = false,
  searchPlaceholder = "חפש...",
  emptyMessage = "לא נמצאו פריטים",
  title,
  headerActions,
  showSearch = true,
  showHeader = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  showFilters = false,
  className = ""
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const handleSearch = (value) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const handleFilterChange = (filterKey, value) => {
    const newFilterValues = { ...filterValues, [filterKey]: value };
    onFilterChange?.(newFilterValues);
  };

  const clearFilter = (filterKey) => {
    const newFilterValues = { ...filterValues };
    delete newFilterValues[filterKey];
    onFilterChange?.(newFilterValues);
  };

  const clearAllFilters = () => {
    onFilterChange?.({});
  };

  const hasActiveFilters = Object.keys(filterValues).some(key => filterValues[key]);

  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
    onSort?.(columnKey, direction);
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Apply search filter if search is handled locally
    if (!onSearch && searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = data.filter(item =>
        columns.some(column => {
          const value = column.accessor ? item[column.accessor] : '';
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply sorting if sort is handled locally
    if (!onSort && sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (sortConfig.direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, columns, onSearch, onSort]);

  const renderCellContent = (item, column) => {
    if (column.render) {
      return column.render(item[column.accessor], item);
    }

    const value = column.accessor ? item[column.accessor] : '';

    // Handle different data types
    if (column.type === 'badge') {
      return <Badge variant={column.badgeVariant || 'default'}>{value}</Badge>;
    }

    if (column.type === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'כן' : 'לא'}
        </Badge>
      );
    }

    if (column.type === 'date') {
      return value ? new Date(value).toLocaleDateString('he-IL') : '-';
    }

    if (column.type === 'number') {
      return value?.toLocaleString('he-IL') || '-';
    }

    return value || '-';
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortConfig.direction === 'asc' ?
      <ChevronUp className="w-4 h-4" /> :
      <ChevronDown className="w-4 h-4" />;
  };

  const tableContent = (
    <div className="space-y-4">
      {/* Header */}
      {showHeader && (title || headerActions || showSearch || showFilters) && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pr-10 w-full sm:w-64"
                  />
                </div>
              )}
              {showFilters && filters.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`${hasActiveFilters ? 'bg-blue-50 border-blue-200' : ''}`}
                >
                  <Filter className="w-4 h-4 ml-2" />
                  סינון
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="mr-2">
                      {Object.keys(filterValues).filter(key => filterValues[key]).length}
                    </Badge>
                  )}
                </Button>
              )}
              {headerActions && (
                <div className="flex gap-2">
                  {headerActions}
                </div>
              )}
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && showFilterPanel && filters.length > 0 && (
            <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">סינון תוצאות</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <X className="w-4 h-4 ml-2" />
                    נקה הכל
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filters.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {filter.label}
                      </label>
                      {filterValues[filter.key] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearFilter(filter.key)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {filter.type === 'select' && (
                      <Select
                        value={filterValues[filter.key] || ''}
                        onValueChange={(value) => handleFilterChange(filter.key, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={filter.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {filter.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {filter.type === 'text' && (
                      <Input
                        placeholder={filter.placeholder}
                        value={filterValues[filter.key] || ''}
                        onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`${column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''} ${column.width || ''}`}
                  onClick={column.sortable ? () => handleSort(column.accessor || column.key) : undefined}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && getSortIcon(column.accessor || column.key)}
                  </div>
                </TableHead>
              ))}
              {actions.length > 0 && <TableHead className="w-12">פעולות</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="h-24">
                  <div className="flex items-center justify-center">
                    <LudoraLoadingSpinner size="sm" />
                    <span className="mr-2 text-gray-500">טוען...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="h-24 text-center">
                  <div className="text-gray-500">{emptyMessage}</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((item, index) => (
                <TableRow key={item.id || index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {renderCellContent(item, column)}
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((action, actionIndex) => (
                            <DropdownMenuItem
                              key={actionIndex}
                              onClick={() => action.onClick(item)}
                              className={action.destructive ? 'text-red-600' : ''}
                            >
                              {action.icon && <action.icon className="w-4 h-4 ml-2" />}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return title || showHeader ? (
    <Card className={className}>
      <CardContent className="p-6">
        {tableContent}
      </CardContent>
    </Card>
  ) : (
    <div className={className}>
      {tableContent}
    </div>
  );
}
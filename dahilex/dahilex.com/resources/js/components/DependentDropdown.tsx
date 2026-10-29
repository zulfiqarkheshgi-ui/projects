import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { capitalize } from '@/utils/helpers';

interface DropdownField {
    name: string;
    label: string;
    required?: boolean;
    searchable?: boolean;
    options?: { value: string; label: string }[];
    dependencies?: Record<string, { value: string; label: string }[]>;
    apiEndpoint?: string;
    emptyNote?: { text?: string; link: string; linkText: string } | ((formData?: any) => { text?: string; link: string; linkText: string } | null);
}

interface DependentDropdownProps {
    fields: DropdownField[];
    values: Record<string, string>;
    onChange: (fieldName: string, value: string, formData?: any, additionalData?: any) => void;
    disabled?: boolean;
    errors?: Record<string, string>;
}

export default function DependentDropdown({ fields, values, onChange, disabled = false, errors = {} }: DependentDropdownProps) {
    const { base_url } = usePage().props as any

    const [availableOptions, setAvailableOptions] = useState<Record<string, { value: string; label: string }[]>>(() => {
        const initial: Record<string, { value: string; label: string }[]> = {};
        fields.forEach((field, index) => {
            if (index === 0) {
                initial[field.name] = field.options || [];
            } else {
                initial[field.name] = [];
            }
        });
        return initial;
    });
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    // Load options from API
    const loadOptionsFromAPI = async (field: DropdownField, parentValue?: string) => {
        if (!field.apiEndpoint) return [];

        setLoading((prev) => ({ ...prev, [field.name]: true }));

        try {
            let endpoint = field.apiEndpoint;
            if (parentValue) {
                // Replace placeholder with actual value - sanitize parentValue
                const sanitizedValue = encodeURIComponent(String(parentValue));
                const parentFieldName = fields[fields.indexOf(field) - 1]?.name;
                if (parentFieldName) {
                    endpoint = endpoint.replace(`{${parentFieldName}}`, sanitizedValue);
                }
            }

            // Loading options from API endpoint
            const response = await fetch(`${base_url}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Transform API response to options format
            const options = Array.isArray(data)
                ? data.map((item) => ({
                      value: String(item.id || item.value || ''),
                      label: String(item.name || item.label || 'Unknown'),
                  }))
                : [];

            return options;
        } catch (error) {
            // Silent error handling - don't log user input
            return [];
        } finally {
            setLoading((prev) => ({ ...prev, [field.name]: false }));
        }
    };

    // Initialize available options for dependent fields
    useEffect(() => {
        const loadAllOptions = async () => {
            const newAvailableOptions: Record<string, { value: string; label: string }[]> = {};

            for (let index = 0; index < fields.length; index++) {
                const field = fields[index];

                if (index === 0) {
                    // First field - load from API or use static options
                    if (field.apiEndpoint) {
                        newAvailableOptions[field.name] = await loadOptionsFromAPI(field);
                    } else {
                        newAvailableOptions[field.name] = field.options || [];
                    }
                } else {
                    // Dependent fields need parent value
                    const parentField = fields[index - 1];
                    const parentValue = values[parentField.name];

                    if (parentValue) {
                        if (field.apiEndpoint) {
                            newAvailableOptions[field.name] = await loadOptionsFromAPI(field, parentValue);
                        } else if (field.dependencies) {
                            newAvailableOptions[field.name] = field.dependencies[parentValue] || [];
                        } else {
                            newAvailableOptions[field.name] = [];
                        }
                    } else {
                        newAvailableOptions[field.name] = [];
                    }
                }
            }

            setAvailableOptions(newAvailableOptions);
        };

        loadAllOptions();
    }, [fields]);

    const handleFieldChange = async (fieldName: string, value: string, fieldIndex: number) => {
        // Clear all dependent fields when parent changes
        fields.slice(fieldIndex + 1).forEach((dependentField) => {
            onChange(dependentField.name, '');
        });

        // Get selected field info for the callback
        const currentField = fields.find((f) => f.name === fieldName);
        const currentFieldOptions = availableOptions[fieldName] || currentField?.options || [];
        const selectedItem = currentFieldOptions.find((opt) => String(opt.value) === String(value));
        const selectedInfo = selectedItem ? { id: value, name: selectedItem.label } : null;

        // Load options for the next dependent field immediately
        const nextField = fields[fieldIndex + 1];
        if (nextField && value) {
            if (nextField.apiEndpoint) {
                const options = await loadOptionsFromAPI(nextField, value);
                setAvailableOptions((prev) => ({
                    ...prev,
                    [nextField.name]: options,
                }));

                // Pass selected info with loaded options
                onChange(fieldName, value, { selectedInfo, loadedOptions: options });
                return;
            } else if (nextField.dependencies) {
                const dependentOptions = nextField.dependencies[value] || [];
                setAvailableOptions((prev) => ({
                    ...prev,
                    [nextField.name]: dependentOptions,
                }));

                onChange(fieldName, value, { selectedInfo, loadedOptions: dependentOptions });
                return;
            }
        }

        // Update the field value with selected info (for fields without dependents)
        onChange(fieldName, value, { selectedInfo, loadedOptions: [] });
    };



    return (
        <div className="space-y-4">
            {fields.map((field, index) => {
                const isFirstField = index === 0;
                const parentField = isFirstField ? null : fields[index - 1];
                const isDisabled = disabled || (!isFirstField && !values[parentField!.name]);
                const fieldOptions = availableOptions[field.name] || [];
                const isLoading = loading[field.name];

                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name} className="text-sm font-medium">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Select
                            value={values[field.name] || ''}
                            onValueChange={(value) => handleFieldChange(field.name, value, index)}
                            disabled={isDisabled || isLoading}
                        >
                            <SelectTrigger className={`w-full${errors[field.name] ? ' border-red-500' : ''}`}>
                                <SelectValue placeholder={
                                    isLoading ? 'Loading...' : `Select ${capitalize(field.label)}`
                                } />
                            </SelectTrigger>
                            <SelectContent className="z-[60000]" searchable={field.searchable}>
                                {fieldOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors[field.name] && (
                            <p className="text-xs text-red-500">{errors[field.name]}</p>
                        )}
                        {fieldOptions.length === 0 && !isLoading && !isDisabled && field.emptyNote && (
                            <p className="text-xs mt-1">
                                {typeof field.emptyNote === 'function' ? (() => {
                                    const note = field.emptyNote(values);
                                    return note ? (
                                        <>{note.text || 'Click here to add'} <Link href={note.link} className="underline font-medium">{note.linkText}</Link></>
                                    ) : null;
                                })() : (
                                    <>{field.emptyNote.text || 'Click here to add'} <Link href={field.emptyNote.link} className="underline font-medium">{field.emptyNote.linkText}</Link></>
                                )}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

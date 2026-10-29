import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');

    if (names.length === 0) return '';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();

    const firstInitial = names[0].charAt(0);
    const lastInitial = names[names.length - 1].charAt(0);

    return `${firstInitial}${lastInitial}`.toUpperCase();
}

const UserColumn = ({ user , hideAvatar = false }: { user?: any, hideAvatar?:boolean}) => {
    return (
        <div className="flex items-center gap-3">
            {!hideAvatar && <Avatar className="h-10 w-10">
                <AvatarImage
                    src={user?.avatar}
                    alt={user?.name}
                />
                <AvatarFallback className="text-lg">
                    {getInitials(user?.name)}
                </AvatarFallback>
            </Avatar>}
            <div>
                <div className="font-medium">{user?.name}</div>
                <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
        </div>
    )
}

export default UserColumn

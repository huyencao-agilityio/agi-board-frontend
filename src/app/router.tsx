import { createBrowserRouter, type RouteObject } from 'react-router'
import PageNotAvailable from '@/components/common/PageNotAvailable'
import AdminUserDetailPage from '@/features/admin/pages/AdminUserDetailPage'
import AdminUsersPage from '@/features/admin/pages/AdminUsersPage'
import ClosedBoardsPage from '@/features/archive/pages/ClosedBoardsPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'
import SignInPage from '@/features/auth/pages/SignInPage'
import SignUpPage from '@/features/auth/pages/SignUpPage'
import VerifyEmailPage from '@/features/auth/pages/VerifyEmailPage'
import BoardPage from '@/features/boards/pages/BoardPage'
import CardWindowPage from '@/features/cards/pages/CardWindowPage'
import ProfilePage from '@/features/profile/pages/ProfilePage'
import StatusPage from '@/features/status/pages/StatusPage'
import AuditLogPage from '@/features/workspaces/pages/AuditLogPage'
import HomePage from '@/features/workspaces/pages/HomePage'
import WorkspaceBoardsPage from '@/features/workspaces/pages/WorkspaceBoardsPage'
import WorkspaceMembersPage from '@/features/workspaces/pages/WorkspaceMembersPage'
import WorkspaceSettingsPage from '@/features/workspaces/pages/WorkspaceSettingsPage'
import { RequireAuth, RequireGuest, RequireSystemRole } from './guards'
import AdminLayout from './layouts/AdminLayout'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import WorkspaceLayout from './layouts/WorkspaceLayout'
import Redirect from './Redirect'
import RouteError from './RouteError'

// Route ↔ screen table: docs/frontend-init-plan.md section 4. Dialogs (WEB-D01…D17) are not routes.
export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    children: [
      // The API's Google callback redirects to /sign-in and /home.
      { path: 'sign-in', element: <Redirect to="/signin" /> },
      { path: 'home', element: <Redirect to="/" /> },
      { path: 'status', element: <StatusPage /> }, // technical page, outside the auth guards
      {
        element: <AuthLayout />,
        children: [
          {
            element: <RequireGuest />,
            children: [
              { path: 'signin', element: <SignInPage /> }, // WEB-01
              { path: 'signup', element: <SignUpPage /> }, // WEB-02
              { path: 'verify-email', element: <VerifyEmailPage /> }, // WEB-16
            ],
          },
          { path: 'forgot-password', element: <ForgotPasswordPage /> }, // WEB-14
          { path: 'reset-password', element: <ResetPasswordPage /> }, // WEB-15
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            errorElement: <RouteError />,
            children: [
              { index: true, element: <HomePage /> }, // WEB-03
              {
                path: 'w/:workspaceId',
                element: <WorkspaceLayout />,
                children: [
                  { index: true, element: <WorkspaceBoardsPage /> }, // WEB-04
                  { path: 'members', element: <WorkspaceMembersPage /> }, // WEB-05
                  { path: 'settings', element: <WorkspaceSettingsPage /> }, // WEB-06
                  { path: 'closed-boards', element: <ClosedBoardsPage /> }, // WEB-09
                  { path: 'audit-log', element: <AuditLogPage /> }, // WEB-12
                ],
              },
              {
                path: 'b/:boardId',
                element: <BoardPage />, // WEB-07
                // WEB-08 opens as a modal over the board, with its own URL so card links can be shared.
                children: [{ path: 'c/:cardNumber', element: <CardWindowPage /> }],
              },
              { path: 'profile', element: <ProfilePage /> }, // WEB-17
              {
                path: 'admin',
                element: <RequireSystemRole roles={['SUPPORT', 'SUPER_ADMIN']} />,
                children: [
                  {
                    element: <AdminLayout />,
                    children: [
                      { path: 'users', element: <AdminUsersPage /> }, // WEB-10
                      { path: 'users/:userId', element: <AdminUserDetailPage /> }, // WEB-19
                    ],
                  },
                ],
              },
              { path: '*', element: <PageNotAvailable />, handle: { notFound: true } }, // WEB-13
            ],
          },
        ],
      },
    ],
  },
]

export const createRouter = () => createBrowserRouter(routes)

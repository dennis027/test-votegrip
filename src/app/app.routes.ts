import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Home } from './components/home/home';
import { Dashboard } from './components/dashboard/dashboard';
import { MainMenu } from './components/main-menu/main-menu';
import { TwoFactorAuth } from './components/two-factor-auth/two-factor-auth';
import { AuthGuard } from './guards/auth-guard';
import { RequestResetPassword } from './components/auth/request-reset-password/request-reset-password';
import { ResetPassword } from './components/auth/reset-password/reset-password';
import { RequestCredentials } from './components/request-credentials/request-credentials';
import { AdminDashboard } from './components/admin/admin-dashboard/admin-dashboard';
import { AdminMenu } from './components/admin/admin-menu/admin-menu';
import { ManageCandidates } from './components/admin/manage-candidates/manage-candidates';

export const routes: Routes = [
  {path:'',component:Home},
  {path: 'login', component: Login },
  {path: 'two-factor-auth', component: TwoFactorAuth },
  { path: 'request-reset-password', component: RequestResetPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'request-credentials', component: RequestCredentials },

  {path:'main-menu', canActivate: [AuthGuard], component:MainMenu,children:[
      {path:'dashboard',component:Dashboard },
  ]},

  {path:'admin-menu', canActivate: [AuthGuard], component:AdminMenu,children:[
      {path:'admin-dashboard',component:AdminDashboard },
      {path:"manage-candidates", component:ManageCandidates},
  ]},


  {path: '', redirectTo: 'home', pathMatch: 'full' } 
];  
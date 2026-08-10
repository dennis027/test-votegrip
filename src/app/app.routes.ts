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
import { ManageAgents } from './components/candidates/manage-agents/manage-agents';
import { ManageMobilizers } from './components/candidates/manage-mobilizers/manage-mobilizers';
import { ManageTraining } from './components/admin/manage-training/manage-training';
import { CurrentCustomers } from './components/admin/current-customers/current-customers';
import { FieldIntel } from './components/candidates/field-intel/field-intel';
import { AssignPollingStation } from './components/candidates/assign-polling-station/assign-polling-station';
import { CoverGaps } from './components/candidates/cover-gaps/cover-gaps';
import { Documentations } from './components/candidates/documentations/documentations';
import { Inventory } from './components/candidates/inventory/inventory';
import { Schedules } from './components/candidates/schedules/schedules';
import { Structure } from './components/candidates/structure/structure';
import { Expenses } from './components/candidates/expenses/expenses';
import { Suppliers } from './components/candidates/suppliers/suppliers';


export const routes: Routes = [
  {path:'',component:Home},
  {path: 'login', component: Login },
  {path: 'two-factor-auth', component: TwoFactorAuth },
  { path: 'request-reset-password', component: RequestResetPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'request-credentials', component: RequestCredentials },

  {path:'main-menu', canActivate: [AuthGuard], component:MainMenu,children:[
      {path:'dashboard',component:Dashboard },
      {path:"manage-agents", component:ManageAgents},
      {path:"manage-mobilizers", component:ManageMobilizers}, 
      {path:'field-intel',component:FieldIntel},
      {path:'assign-polling-station', component:AssignPollingStation},
      {path:'cover-gaps', component:CoverGaps},
      {path:'documentation', component:Documentations},
      {path:'inventory', component:Inventory},
      {path:'schedules', component:Schedules },
      {path:'structure',component:Structure },
      {path:'expenses', component:Expenses},
      {path:'suppliers', component:Suppliers}

  ]},

  {path:'admin-menu', canActivate: [AuthGuard], component:AdminMenu,children:[
      {path:'admin-dashboard',component:AdminDashboard },
      {path:"manage-candidates", component:ManageCandidates},
      {path:'manage-training',component:ManageTraining},
      {path:'current-customers',component:CurrentCustomers},

  ]},


  {path: '', redirectTo: 'home', pathMatch: 'full' } 
];  
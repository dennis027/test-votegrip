import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Home } from './components/home/home';
import { Dashboard } from './components/dashboard/dashboard';
import { MainMenu } from './components/main-menu/main-menu';
import { TwoFactorAuth } from './components/two-factor-auth/two-factor-auth';

export const routes: Routes = [
  {path:'',component:Home},
  {path: 'login', component: Login },
  {path: 'two-factor-auth', component: TwoFactorAuth },

  {path:'main-menu', component:MainMenu,children:[
      {path:'dashboard',component:Dashboard},
  ]},
  {path: '', redirectTo: 'home', pathMatch: 'full' } 
];
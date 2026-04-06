import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Home } from './components/home/home';
import { Dashboard } from './components/dashboard/dashboard';
import { MainMenu } from './components/main-menu/main-menu';

export const routes: Routes = [
  {path:'',component:Home},
  {path: 'login', component: Login },

  {path:'main-menu', component:MainMenu,children:[
      {path:'dashboard',component:Dashboard},
  ]},
  {path: '', redirectTo: 'home', pathMatch: 'full' } 
];
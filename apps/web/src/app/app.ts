import { Component, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly title = signal('web');
  currentUrl = '';

  constructor(private router: Router) {
    this.currentUrl = this.router.url;
  }
}

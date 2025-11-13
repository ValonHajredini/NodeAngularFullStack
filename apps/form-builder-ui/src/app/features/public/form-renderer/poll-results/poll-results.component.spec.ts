import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PollResultsComponent } from './poll-results.component';
import { PollResults } from '@nodeangularfullstack/shared';
import { signal } from '@angular/core';

describe('PollResultsComponent', () => {
  let component: PollResultsComponent;
  let fixture: ComponentFixture<PollResultsComponent>;

  const mockPollResults: PollResults = {
    total_votes: 10,
    vote_counts: {
      javascript: 5,
      python: 3,
      typescript: 2,
    },
    vote_percentages: {
      javascript: 50,
      python: 30,
      typescript: 20,
    },
    user_voted: true,
    user_vote: 'javascript',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PollResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PollResultsComponent);
    component = fixture.componentInstance;

    // Set input signal
    fixture.componentRef.setInput('results', mockPollResults);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display total votes count', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const votesCount = compiled.querySelector('.votes-count');
    expect(votesCount?.textContent).toContain('10');
  });

  it('should display user voted indicator when user has voted', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const userVoteIndicator = compiled.querySelector('.user-vote-indicator');
    expect(userVoteIndicator).toBeTruthy();
    expect(userVoteIndicator?.textContent).toContain('Thank you for voting!');
  });

  it('should not display user voted indicator when user has not voted', () => {
    const resultsWithoutVote: PollResults = {
      ...mockPollResults,
      user_voted: false,
      user_vote: undefined,
    };

    fixture.componentRef.setInput('results', resultsWithoutVote);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const userVoteIndicator = compiled.querySelector('.user-vote-indicator');
    expect(userVoteIndicator).toBeFalsy();
  });

  it('should display vote breakdown items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const breakdownItems = compiled.querySelectorAll('.breakdown-item');
    expect(breakdownItems.length).toBe(3);
  });

  it('should display formatted option labels', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const optionNames = Array.from(compiled.querySelectorAll('.option-name')).map(
      (el) => el.textContent,
    );

    expect(optionNames).toContain('Javascript');
    expect(optionNames).toContain('Python');
    expect(optionNames).toContain('Typescript');
  });

  it('should display vote counts and percentages', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const voteCounts = Array.from(compiled.querySelectorAll('.vote-count'));
    const votePercentages = Array.from(compiled.querySelectorAll('.vote-percentage'));

    expect(voteCounts[0].textContent).toContain('5 votes');
    expect(votePercentages[0].textContent).toContain('50%');
  });

  it('should highlight user vote option', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const yourVoteBadge = compiled.querySelector('.your-vote-badge');
    expect(yourVoteBadge).toBeTruthy();
    expect(yourVoteBadge?.textContent).toContain('Your vote');
  });

  it('should render chart canvas element', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const canvas = compiled.querySelector('.chart-container canvas');
    expect(canvas).toBeTruthy();
  });

  it('should compute chart data sorted by count descending', () => {
    const chartData = component.chartData();
    expect(chartData.length).toBe(3);
    expect(chartData[0].label).toBe('Javascript');
    expect(chartData[0].count).toBe(5);
    expect(chartData[1].label).toBe('Python');
    expect(chartData[1].count).toBe(3);
    expect(chartData[2].label).toBe('Typescript');
    expect(chartData[2].count).toBe(2);
  });

  it('should handle poll with zero votes', () => {
    const emptyResults: PollResults = {
      total_votes: 0,
      vote_counts: {},
      vote_percentages: {},
      user_voted: false,
    };

    fixture.componentRef.setInput('results', emptyResults);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const votesCount = compiled.querySelector('.votes-count');
    expect(votesCount?.textContent).toContain('0');

    const breakdownItems = compiled.querySelectorAll('.breakdown-item');
    expect(breakdownItems.length).toBe(0);
  });
});

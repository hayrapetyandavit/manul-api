import { validateSync } from 'class-validator';
import { CreateReviewDto } from './create-review.dto';

function review(overrides: Partial<CreateReviewDto> = {}): CreateReviewDto {
  return Object.assign(new CreateReviewDto(), {
    bookingId: 9,
    rating: 5,
    comment: 'Careful with the leash',
    ...overrides,
  });
}

describe('CreateReviewDto', () => {
  it('accepts a rating from 1 to 5', () => {
    expect(validateSync(review({ rating: 1 }))).toEqual([]);
    expect(validateSync(review({ rating: 5 }))).toEqual([]);
  });

  it('rejects a rating outside 1 to 5 and a non-positive booking id', () => {
    expect(validateSync(review({ rating: 0 })).length).toBeGreaterThan(0);
    expect(validateSync(review({ rating: 6 })).length).toBeGreaterThan(0);
    expect(validateSync(review({ bookingId: 0 })).length).toBeGreaterThan(0);
  });
});

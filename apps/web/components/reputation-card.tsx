export type ReputationSummary = {
  user_id: string;
  average_rating: number;
  total_reviews: number;
  five_star_reviews: number;
  four_star_reviews: number;
  three_star_reviews: number;
  two_star_reviews: number;
  one_star_reviews: number;
};

export type UserReview = {
  review_id: string;
  order_id: string;
  reviewer_id: string;
  reviewer_display_name: string | null;
  reviewer_username: string | null;
  rating: number;
  comment: string | null;
  listing_title: string;
  card_name: string;
  created_at: string;
};

type ReputationCardProps = {
  userName: string;
  summary: ReputationSummary;
  reviews: UserReview[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="tracking-wider text-yellow-300"
      aria-label={`${rating} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={
            star <= Math.round(rating) ? "text-yellow-300" : "text-zinc-700"
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function ReputationCard({
  userName,
  summary,
  reviews,
}: ReputationCardProps) {
  const distribution = [
    { stars: 5, count: summary.five_star_reviews },
    { stars: 4, count: summary.four_star_reviews },
    { stars: 3, count: summary.three_star_reviews },
    { stars: 2, count: summary.two_star_reviews },
    { stars: 1, count: summary.one_star_reviews },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-white/10 bg-[#13131d] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
          Reputação
        </p>

        <h2 className="mt-3 break-words text-2xl font-black">{userName}</h2>

        <div className="mt-6 rounded-2xl bg-yellow-500/5 p-5 text-center">
          <p className="text-5xl font-black text-yellow-300">
            {Number(summary.average_rating).toFixed(1)}
          </p>

          <div className="mt-2 text-xl">
            <Stars rating={Number(summary.average_rating)} />
          </div>

          <p className="mt-3 text-sm text-zinc-400">
            {summary.total_reviews}{" "}
            {summary.total_reviews === 1 ? "avaliação" : "avaliações"}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {distribution.map((item) => {
            const percentage =
              summary.total_reviews > 0
                ? (item.count / summary.total_reviews) * 100
                : 0;

            return (
              <div
                key={item.stars}
                className="grid grid-cols-[36px_1fr_34px] items-center gap-3 text-sm"
              >
                <span className="font-semibold text-zinc-300">
                  {item.stars}★
                </span>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-yellow-400"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                <span className="text-right text-zinc-500">{item.count}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-white/10 p-4 text-xs leading-5 text-zinc-500">
          As avaliações são permitidas somente após negociações concluídas
          dentro do MastersTCG.
        </div>
      </aside>

      <section>
        <h2 className="text-2xl font-black">Avaliações recebidas</h2>

        {reviews.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-400">
            Este Master ainda não recebeu avaliações.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {reviews.map((review) => {
              const reviewerName =
                review.reviewer_display_name ||
                review.reviewer_username ||
                "Master";

              return (
                <article
                  key={review.review_id}
                  className="rounded-2xl border border-white/10 bg-[#13131d] p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">{reviewerName}</p>

                      <p className="mt-1 text-sm text-zinc-500">
                        Negociação: {review.listing_title}
                      </p>
                    </div>

                    <div className="text-right">
                      <Stars rating={review.rating} />

                      <p className="mt-1 text-xs text-zinc-600">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>

                  {review.comment ? (
                    <p className="mt-5 whitespace-pre-wrap break-words leading-7 text-zinc-300">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="mt-5 text-sm italic text-zinc-600">
                      Avaliação sem comentário.
                    </p>
                  )}

                  <p className="mt-4 text-xs text-zinc-600">
                    Carta: {review.card_name}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

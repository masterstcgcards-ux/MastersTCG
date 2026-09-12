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
    <span className="tracking-wider" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={
            star <= Math.round(rating) ? "text-amber-400" : "text-slate-200"
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
      <aside className="h-fit overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#071a4c] via-blue-800 to-blue-600 p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
            Reputação
          </p>

          <h2 className="mt-3 break-words text-2xl font-black">{userName}</h2>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
            <p className="text-5xl font-black text-[#071a4c]">
              {Number(summary.average_rating).toFixed(1)}
            </p>

            <div className="mt-2 text-xl">
              <Stars rating={Number(summary.average_rating)} />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-600">
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
                  <span className="font-bold text-[#071a4c]">
                    {item.stars}★
                  </span>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <span className="text-right font-semibold text-slate-500">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-slate-600">
            As avaliações são permitidas somente após negociações concluídas
            dentro do MastersTCG.
          </div>
        </div>
      </aside>

      <section>
        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Comunidade Masters
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#071a4c]">
            Avaliações recebidas
          </h2>
        </div>

        {reviews.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-500">
              ★
            </div>

            <h3 className="mt-5 text-xl font-black text-[#071a4c]">
              Nenhuma avaliação
            </h3>

            <p className="mt-2 text-slate-600">
              Este Master ainda não recebeu avaliações.
            </p>
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
                  className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-[#071a4c]">
                        {reviewerName}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Negociação: {review.listing_title}
                      </p>
                    </div>

                    <div className="text-right">
                      <Stars rating={review.rating} />

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>

                  {review.comment ? (
                    <p className="mt-5 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 leading-7 text-slate-700">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm italic text-slate-500">
                      Avaliação sem comentário.
                    </p>
                  )}

                  <p className="mt-4 text-xs font-semibold text-blue-600">
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

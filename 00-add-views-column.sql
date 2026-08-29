-- BuyRank: real impression counter. Run once against production.
alter table entries add column if not exists views integer not null default 0;

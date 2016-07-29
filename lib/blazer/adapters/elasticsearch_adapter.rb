module Blazer
  module Adapters
    class ElasticsearchAdapter < BaseAdapter
      def run_statement(statement, comment)
        columns = []
        rows = []
        error = nil

        begin
          header, body = statement.gsub(/\/\/.+/, "").strip.split("\n", 2)
          response = client.msearch(body: [JSON.parse(header), JSON.parse(body)])["responses"].first
          hits = response["hits"]["hits"]
          source_keys = hits.flat_map { |r| r["_source"].keys }.uniq
          hit_keys = (hits.first.try(:keys) || []) - ["_source"]
          columns = source_keys + hit_keys
          rows =
            hits.map do |r|
              source = r["_source"]
              source_keys.map { |k| source[k] } + hit_keys.map { |k| r[k] }
            end
        rescue => e
          error = e.message
        end

        [columns, rows, error]
      end

      def tables
        client.indices.get_aliases.map { |k, v| [k, v["aliases"].keys] }.flatten.uniq.sort
      end

      def preview_statement
        %!// header\n{"index": "{table}"}\n\n// body\n{"query": {"match_all": {}}, "size": 10}!
      end

      protected

      def client
        @client ||= Elasticsearch::Client.new(url: settings["url"])
      end
    end
  end
end

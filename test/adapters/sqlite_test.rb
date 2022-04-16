require_relative "../test_helper"

class SqliteTest < ActionDispatch::IntegrationTest
  include AdapterTest

  def data_source
    "sqlite"
  end

  def test_run
    assert_result [{"hello" => "world"}], "SELECT 'world' AS hello"
  end
end

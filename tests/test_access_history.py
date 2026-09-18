import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('import_history', Path(__file__).parents[1] / 'scripts/import-access-history.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class AccessHistoryTest(unittest.TestCase):
    def line(self, target='/course-plan/kete-moon', agent='Mozilla/5.0 Chrome/130', status='200', method='GET'):
        return f'192.0.2.1 - - [11/Sep/2026:23:30:00 +0000] "{method} {target} HTTP/1.1" {status} 500 "-" "{agent}"'

    def test_document_and_timezone(self):
        row, reason = module.parse_line(self.line('/course-plan/kete-moon/?from=teacher'))
        self.assertEqual(reason, 'accepted')
        self.assertEqual(row['date'], '2026-09-12')
        self.assertEqual(row['course'], 'kete-moon')

    def test_filtering(self):
        for line in [self.line('/course-plan/kete-moon?_rsc='), self.line(agent='Mozilla HeadlessChrome'), self.line(agent='node'), self.line(status='404'), self.line(method='POST'), self.line('/images/course-plan/photo.png')]:
            self.assertIsNone(module.parse_line(line)[0])

if __name__ == '__main__':
    unittest.main()

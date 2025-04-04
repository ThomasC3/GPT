import { library } from '@fortawesome/fontawesome-svg-core';
import * as Icons from '@fortawesome/free-solid-svg-icons';

Object.entries(Icons.fas).forEach(icon => library.add(icon[1]));
